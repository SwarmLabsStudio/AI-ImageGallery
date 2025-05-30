import { NextResponse } from 'next/server';

const BASEROW_API_TOKEN = process.env.NEXT_PUBLIC_BASEROW_API_TOKEN;
const BASEROW_BASE_URL = 'http://host.docker.internal:85';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tableId = searchParams.get('tableId');

  try {
    console.log('Fetching from Baserow:', `${BASEROW_BASE_URL}/api/database/rows/table/${tableId}/`);
    
    const response = await fetch(`${BASEROW_BASE_URL}/api/database/rows/table/${tableId}/`, {
      headers: {
        'Authorization': `Token ${BASEROW_API_TOKEN}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
    });

    if (!response.ok) {
      console.error('Baserow API error:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('Error details:', errorText);
      throw new Error(`Baserow API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Baserow API response:', JSON.stringify(data, null, 2));
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch data from Baserow' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    console.log('DELETE request received');
    console.log('Request URL:', request.url);
    
    const url = new URL(request.url);
    console.log('Parsed URL:', {
      pathname: url.pathname,
      search: url.search,
      searchParams: Object.fromEntries(url.searchParams.entries())
    });

    const tableId = url.searchParams.get('tableId');
    const rowId = url.searchParams.get('rowId');

    console.log('Extracted parameters:', { tableId, rowId });

    if (!tableId || !rowId) {
      console.error('Missing required parameters');
      return NextResponse.json(
        { error: 'Table ID and Row ID are required' },
        { status: 400 }
      );
    }

    console.log(`Deleting row ${rowId} from table ${tableId}`);
    const deleteUrl = `${BASEROW_BASE_URL}/api/database/rows/table/${tableId}/${rowId}/`;
    console.log('Delete URL:', deleteUrl);
    
    const response = await fetch(deleteUrl, {
      method: 'DELETE',
      headers: {
        'Authorization': `Token ${BASEROW_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('Baserow response status:', response.status);

    if (!response.ok) {
      console.error('Baserow API error:', response.status, response.statusText);
      let errorDetails = '';
      try {
        const errorText = await response.text();
        errorDetails = errorText;
        console.error('Error details:', errorText);
      } catch (e) {
        console.error('Could not read error details:', e);
      }
      
      return NextResponse.json(
        { 
          error: `Baserow API error: ${response.status} ${response.statusText}`,
          details: errorDetails
        },
        { status: response.status }
      );
    }

    console.log('Delete successful, returning 204');
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to delete row from Baserow',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 